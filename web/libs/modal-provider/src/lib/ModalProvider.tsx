import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import * as React from "react";
import { createPortal } from "react-dom";

type ModalContent = {
  type: "confirm";
  title: string;
  content?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  onConfirm?: () => boolean | void;
  onCancel?: () => void;
};

export type IOpenModal = (modal: ModalContent) => void;

export type IModalProviderContext = {
  currentModal?: ModalContent;
  openModal: IOpenModal;
};

const ModalProviderContext = React.createContext<IModalProviderContext | undefined>(undefined);

export type ModalProviderProps = {
  children?: React.ReactNode;
};

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [currModal, setCurrModal] = React.useState<ModalContent | undefined>();

  const handleCloseModal = React.useCallback(
    (reason: "backdropClick" | "escapeKeyDown" | "closeButton") => {
      if (!currModal) {
        return;
      }
      if (currModal.closeOnBackdropClick === false && reason === "backdropClick") {
        return;
      }
      currModal.onCancel?.();
      setCurrModal(undefined);
    },
    [currModal]
  );

  const handleConfirmModal = React.useCallback(() => {
    if (!currModal) {
      return;
    }
    const shouldClose = currModal.onConfirm?.() ?? true;
    if (shouldClose) {
      setCurrModal(undefined);
    }
  }, [currModal]);

  const contextValue = React.useMemo(() => {
    const openModal = (modal: ModalContent) => {
      setCurrModal(modal);
    };

    return {
      currentModal: currModal,
      openModal,
    };
  }, [setCurrModal, currModal]);

  let modal = null;
  if (currModal) {
    // TODO: translations
    modal = (
      <Dialog open={true} onClose={(evt, reason) => handleCloseModal(reason)}>
        <DialogTitle>{currModal.title}</DialogTitle>
        {currModal.content && <DialogContent>{currModal.content}</DialogContent>}
        <DialogActions>
          <Button color="error" onClick={() => handleCloseModal("closeButton")}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleConfirmModal}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <ModalProviderContext.Provider value={contextValue}>{children}</ModalProviderContext.Provider>

      {modal && createPortal(modal, document.body)}
    </>
  );
};

export const useOpenModal = (): IOpenModal => {
  const ctx = React.useContext(ModalProviderContext);
  if (!ctx) {
    throw new Error("useOpenModal requires a ModalProvider to be placed in the component tree above");
  }

  return ctx.openModal;
};
