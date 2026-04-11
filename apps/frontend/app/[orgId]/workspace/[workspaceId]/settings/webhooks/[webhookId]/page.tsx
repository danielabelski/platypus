import { WebhookForm } from "@/components/webhook-form";
import { BackButton } from "@/components/back-button";

const WebhookEditPage = async ({
  params,
}: {
  params: Promise<{ orgId: string; workspaceId: string; webhookId: string }>;
}) => {
  const { orgId, workspaceId, webhookId } = await params;

  return (
    <div>
      <BackButton
        fallbackHref={`/${orgId}/workspace/${workspaceId}/settings/webhooks`}
      />
      <h1 className="text-2xl mb-4 font-bold">Edit Webhook</h1>
      <WebhookForm
        orgId={orgId}
        workspaceId={workspaceId}
        webhookId={webhookId}
      />
    </div>
  );
};

export default WebhookEditPage;
