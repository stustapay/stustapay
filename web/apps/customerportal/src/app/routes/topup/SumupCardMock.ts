import { type SumUpCard } from "./SumUpCard";

let htmlElement: HTMLElement | null = null;

export const SumUpCardMock: SumUpCard = {
  mount: (cfg) => {
    htmlElement = document.getElementById(cfg.id);
    if (htmlElement) {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.border = "2px solid green";
      div.style.width = "500px";
      div.style.height = "300px";
      div.style.justifyContent = "center";
      div.style.alignContent = "center";
      div.textContent = "DUMMY SUMUP CARD HERE .......";
      htmlElement.appendChild(div);
    }
    if (cfg.onLoad) {
      setTimeout(cfg.onLoad, 500);
    }
    if (cfg.onResponse) {
      setTimeout(() => {
        if (cfg.onResponse) {
          cfg.onResponse("success");
          // cfg.onResponse("error");
        }
      }, 2000);
    }
    return {
      submit: () => undefined,
      unmount: () => {
        if (htmlElement) {
          while (htmlElement.firstChild) {
            htmlElement.removeChild(htmlElement.firstChild);
          }
          htmlElement = null;
        }
      },
      update: (cfg) => undefined,
    };
  },
};
