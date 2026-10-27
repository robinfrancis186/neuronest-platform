import hashlib, io, uuid
from pathlib import Path
import boto3
from django.conf import settings
from rest_framework.exceptions import ValidationError
from .errors import Unavailable
from . import models as m
from .access import require_child, audit, emit


def client():
    return boto3.client(
        "s3", region_name=settings.AWS_REGION, endpoint_url=settings.S3_ENDPOINT_URL
    )


def read_bytes(obj):
    if settings.S3_BUCKET:
        return client().get_object(Bucket=settings.S3_BUCKET, Key=obj.object_key)["Body"].read()
    return (settings.MEDIA_ROOT / obj.object_key).read_bytes()


def upload(user, child, file):
    require_child(user, child, "records")
    if settings.PRODUCTION and not (
        settings.S3_BUCKET and settings.CLAMAV_HOST and settings.OUTBOX_WORKER_ENABLED
    ):
        raise Unavailable(
            "Attachments require private object storage, malware scanning and an active delivery worker."
        )
    if file.size > 10 * 1024 * 1024:
        raise ValidationError("Maximum attachment size is 10 MiB.")
    data = file.read()
    content_type = None
    if data.startswith(b"%PDF-"):
        content_type = "application/pdf"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        content_type = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        content_type = "image/jpeg"
    if not content_type:
        raise ValidationError(
            "Only PDF, PNG and JPEG files with matching byte signatures are accepted."
        )
    if content_type.startswith("image/"):
        from PIL import Image, UnidentifiedImageError

        try:
            image = Image.open(io.BytesIO(data))
            if image.width * image.height > 16_000_000:
                raise ValidationError("Images must not exceed 16 megapixels.")
            image.verify()
            image = Image.open(io.BytesIO(data))
            image.load()
            output = io.BytesIO()
            image.save(output, format="PNG" if content_type == "image/png" else "JPEG")
            data = output.getvalue()
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
            raise ValidationError("Image could not be safely decoded.") from exc
    if len(data) > 10 * 1024 * 1024:
        raise ValidationError("Sanitized attachment exceeds 10 MiB.")
    key = f"quarantine/{uuid.uuid4().hex}"
    if settings.S3_BUCKET:
        client().put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)
    else:
        target = settings.MEDIA_ROOT / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        target.chmod(0o600)
    obj = m.Attachment.objects.create(
        child=child,
        author=user,
        filename=Path(file.name).name[:255],
        object_key=key,
        content_type=content_type,
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )
    audit(user, child, "attachment.quarantined", obj)
    emit("attachment.scan", obj, user, child)
    return obj
