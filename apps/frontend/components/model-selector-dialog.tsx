import { Agent, Provider } from "@platypus/schemas";
import { Bot } from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorTrigger,
} from "./ai-elements/model-selector";
import { Button } from "./ui/button";

interface ModelSelectorDialogProps {
  agents: Agent[];
  providers: Provider[];
  agentId: string;
  modelId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onModelChange: (value: string) => void;
}

export const ModelSelectorDialog = ({
  agents,
  providers,
  agentId,
  modelId,
  isOpen,
  onOpenChange,
  onModelChange,
}: ModelSelectorDialogProps) => {
  const selectedAgent = agentId ? agents.find((a) => a.id === agentId) : null;

  return (
    <ModelSelector open={isOpen} onOpenChange={onOpenChange}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-40 overflow-hidden sm:max-w-none"
        >
          {selectedAgent ? (
            <>
              {selectedAgent.avatarUrl ? (
                <img
                  src={selectedAgent.avatarUrl}
                  alt={selectedAgent.name}
                  className="size-4 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-4 items-center justify-center rounded-full bg-muted">
                  <Bot className="size-2.5 text-muted-foreground" />
                </div>
              )}
              <span className="truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <span className="truncate">
              {modelId || "Select model"}
            </span>
          )}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search agents and models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No results found.</ModelSelectorEmpty>
          {/* Agents Group */}
          {agents.length > 0 && (
            <ModelSelectorGroup heading="Agents">
              {agents.map((agent) => (
                <ModelSelectorItem
                  key={agent.id}
                  value={`agent:${agent.id}`}
                  className="cursor-pointer"
                  onSelect={() => {
                    onModelChange(`agent:${agent.id}`);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-5 items-center justify-center rounded-full bg-muted">
                        <Bot className="size-3 text-muted-foreground" />
                      </div>
                    )}
                    <span>{agent.name}</span>
                  </div>
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          )}

          {/* Providers Group */}
          {providers.map((provider) => (
            <ModelSelectorGroup key={provider.id} heading={provider.name}>
              {provider.modelIds.map((model) => (
                <ModelSelectorItem
                  key={`provider:${provider.id}:${model}`}
                  className="cursor-pointer"
                  value={`provider:${provider.id}:${model}`}
                  onSelect={() => {
                    onModelChange(`provider:${provider.id}:${model}`);
                    onOpenChange(false);
                  }}
                >
                  {model}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
