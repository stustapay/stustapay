export type SumUpResponseType = "sent" | "invalid" | "auth-screen" | "error" | "success";

export interface CardOptions {
  id: string;
  checkoutId: string;
  locale?: string;
  onLoad?: () => void;
  onResponse?: (type: SumUpResponseType, body?: any) => void;
}

export interface SumUpCardInstance {
  submit: () => void;
  unmount: () => void;
  update: (cfg: Partial<CardOptions>) => void;
}

export interface SumUpCard {
  mount: (cfg: CardOptions) => SumUpCardInstance;
}
