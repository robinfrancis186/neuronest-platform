FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home --uid 10001 app && mkdir -p /data/private && chown app:app /data/private
COPY --chown=app:app . .
USER app
EXPOSE 8000
CMD ["gunicorn", "neuronest.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "60"]
