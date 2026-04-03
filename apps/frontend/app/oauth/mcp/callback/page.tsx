import { OAuthCallbackHandler } from "./oauth-callback-handler";

const OAuthCallbackPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string }>;
}) => {
  const { code, state } = await searchParams;

  return <OAuthCallbackHandler code={code} state={state} />;
};

export default OAuthCallbackPage;
