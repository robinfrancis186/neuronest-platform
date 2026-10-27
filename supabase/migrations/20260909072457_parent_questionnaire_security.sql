-- The Django core is the sole access path for parent questionnaire responses.
ALTER TABLE public.api_parentquestionnaireresponse ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_parentquestionnaireresponse FROM anon, authenticated;

DROP POLICY IF EXISTS neuronest_no_direct_api ON public.api_parentquestionnaireresponse;
CREATE POLICY neuronest_no_direct_api
  ON public.api_parentquestionnaireresponse
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
