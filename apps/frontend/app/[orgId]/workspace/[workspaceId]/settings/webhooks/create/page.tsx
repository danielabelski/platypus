import { WebhookForm } from "@/components/webhook-form";
import { BackButton } from "@/components/back-button";

const WebhookCreatePage = async ({
  params,
}: {
  params: Promise<{ orgId: string; workspaceId: string }>;
}) => {
  const { orgId, workspaceId } = await params;

  return (
    <div>
      <BackButton
        fallbackHref={`/${orgId}/workspace/${workspaceId}/settings/webhooks`}
      />
      <h1 className="text-2xl mb-4 font-bold">Create Webhook</h1>
      <WebhookForm orgId={orgId} workspaceId={workspaceId} />
    </div>
  );
};

export default WebhookCreatePage;
