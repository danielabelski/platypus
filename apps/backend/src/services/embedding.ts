import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Provider } from "@platypus/schemas";

/**
 * Creates an embedding model instance based on the provider configuration.
 */
export const createEmbeddingModel = (
  provider: Provider,
  embeddingModelId: string,
) => {
  if (provider.providerType === "OpenAI") {
    const openai = createOpenAI({
      baseURL: provider.baseUrl ?? undefined,
      apiKey: provider.apiKey ?? undefined,
      headers: provider.headers ?? undefined,
      organization: provider.organization ?? undefined,
      project: provider.project ?? undefined,
    });
    return openai.embeddingModel(embeddingModelId);
  } else if (provider.providerType === "OpenRouter") {
    const openRouter = createOpenRouter({
      baseURL: provider.baseUrl ?? undefined,
      apiKey: provider.apiKey ?? undefined,
      headers: provider.headers ?? undefined,
    });
    return openRouter.textEmbeddingModel(embeddingModelId);
  } else if (provider.providerType === "Bedrock") {
    const bedrock = createAmazonBedrock({
      baseURL: provider.baseUrl ?? undefined,
      region: provider.region ?? undefined,
      apiKey: provider.apiKey ?? undefined,
      headers: provider.headers ?? undefined,
    });
    return bedrock.embeddingModel(embeddingModelId);
  } else if (provider.providerType === "Google") {
    const google = createGoogleGenerativeAI({
      baseURL: provider.baseUrl ?? undefined,
      apiKey: provider.apiKey ?? undefined,
      headers: provider.headers ?? undefined,
    });
    return google.embeddingModel(embeddingModelId);
  } else if (provider.providerType === "Anthropic") {
    throw new Error(
      "Anthropic does not support text embeddings. Use a different provider for embeddings.",
    );
  } else {
    throw new Error(`Unrecognized provider type '${provider.providerType}'`);
  }
};

/**
 * Generates an embedding vector for the given text.
 */
export const generateEmbedding = async (
  provider: Provider,
  embeddingModelId: string,
  text: string,
): Promise<number[]> => {
  const model = createEmbeddingModel(provider, embeddingModelId);
  const { embedding } = await embed({ model, value: text });
  return embedding;
};
