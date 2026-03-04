import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAiChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(api.ai.chat.path, {
        method: api.ai.chat.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to communicate with AI");
      return api.ai.chat.responses[200].parse(await res.json());
    },
  });
}
