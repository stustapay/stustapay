import { Delete as DeleteIcon } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import * as React from "react";
import {
  RaRecord,
  useDeleteWithConfirmController,
  useRecordContext,
  useResourceContext,
  useTranslate,
  Confirm,
  DeleteWithConfirmButtonProps,
} from "react-admin";
import clsx from "clsx";
import { humanize, singularize } from "inflection";

export const DeleteIconButton: React.FC<Omit<DeleteWithConfirmButtonProps<RaRecord>, "label">> = (props) => {
  const {
    className,
    confirmTitle = "ra.message.delete_title",
    confirmContent = "ra.message.delete_content",
    confirmColor = "primary",
    icon = <DeleteIcon />,
    mutationMode = "pessimistic",
    onClick,
    redirect = "list",
    translateOptions = {},
    mutationOptions,
    color = "error",
    ...rest
  } = props;
  const translate = useTranslate();
  const record = useRecordContext(props);
  const resource = useResourceContext(props);

  const { open, isPending, handleDialogOpen, handleDialogClose, handleDelete } = useDeleteWithConfirmController({
    record,
    redirect,
    mutationMode,
    onClick,
    mutationOptions,
    resource,
  });

  return (
    <>
      <IconButton
        onClick={handleDialogOpen}
        size="small"
        className={clsx("ra-delete-button", className)}
        key="button"
        color={color}
        {...rest}
      >
        {icon}
      </IconButton>
      <Confirm
        isOpen={open}
        loading={isPending}
        title={confirmTitle}
        content={confirmContent}
        confirmColor={confirmColor}
        translateOptions={{
          name: translate(`resources.${resource}.forcedCaseName`, {
            smart_count: 1,
            _: humanize(
              translate(`resources.${resource}.name`, {
                smart_count: 1,
                _: resource ? singularize(resource) : undefined,
              }),
              true
            ),
          }),
          id: record?.id,
          ...translateOptions,
        }}
        onConfirm={handleDelete}
        onClose={handleDialogClose}
      />
    </>
  );
};
