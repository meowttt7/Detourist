import { sendSigninEmail } from "@/lib/mailer";
import { recordEmailDelivery } from "@/lib/email-delivery-store";
import { buildSigninVerifyUrl, createUserMagicLinkToken } from "@/lib/user-auth";
import type { UserRecord } from "@/lib/types";

type SendSigninLinkInput = {
  user: UserRecord;
  email: string;
  requestedProfileId: string | null;
  deliveryId?: string;
};

export async function sendSigninLink(input: SendSigninLinkInput) {
  const token = await createUserMagicLinkToken({
    userId: input.user.id,
    email: input.email,
    requestedProfileId: input.requestedProfileId,
  });

  const delivery = await sendSigninEmail({
    recipientEmail: input.email,
    verifyUrl: buildSigninVerifyUrl(token.rawToken),
  });

  return recordEmailDelivery({
    id: input.deliveryId,
    kind: "signin",
    referenceId: token.tokenId,
    userId: input.user.id,
    recipientEmail: input.email,
    subject: delivery.subject,
    mode: delivery.mode,
    status: delivery.status,
    metadata: {
      requestedProfileId: input.requestedProfileId,
    },
    errorMessage: delivery.errorMessage,
    sentAt: delivery.sentAt,
    incrementRetryCount: Boolean(input.deliveryId),
  });
}
