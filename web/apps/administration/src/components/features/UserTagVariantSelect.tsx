import { Select, SelectProps } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import * as React from "react";

import { UserTagVariant } from "@/db/api/generated";
import { getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

type UserTagVariantSelectBaseProps = {
  nodeId?: number;
};

type UserTagVariantSelectSingleProps = UserTagVariantSelectBaseProps &
  Omit<SelectProps<UserTagVariant, false>, "options" | "formatOption" | "multiple" | "value" | "onChange"> & {
    multiple?: false;
    value: number | null;
    onChange: (value: number | null) => void;
  };

type UserTagVariantSelectMultipleProps = UserTagVariantSelectBaseProps &
  Omit<SelectProps<UserTagVariant, true>, "options" | "formatOption" | "multiple" | "value" | "onChange"> & {
    multiple: true;
    value: number[];
    onChange: (value: number[]) => void;
  };

export type UserTagVariantSelectProps = UserTagVariantSelectSingleProps | UserTagVariantSelectMultipleProps;

const formatUserTagVariant = (userTagVariant: UserTagVariant) =>
  userTagVariant.description
    ? `${userTagVariant.variant_name} (${userTagVariant.description})`
    : userTagVariant.variant_name;

export function UserTagVariantSelect(props: UserTagVariantSelectMultipleProps): React.ReactElement;
export function UserTagVariantSelect(props: UserTagVariantSelectSingleProps): React.ReactElement;
export function UserTagVariantSelect(props: UserTagVariantSelectProps) {
  const { currentNode } = useCurrentNode();
  const nodeId = props.nodeId ?? currentNode.id;
  const { data: userTagVariants, isLoading } = useLiveQuery(
    (q) => q.from({ userTagVariants: getUserTagVariantCollection(nodeId) }),
    [nodeId]
  );

  if (props.multiple) {
    const { value, onChange, nodeId: _nodeId, ...rest } = props;
    const variants = userTagVariants ?? [];
    const selected = variants.filter((variant) => value.includes(variant.id));

    return (
      <Select
        checkboxes
        loading={isLoading}
        options={variants}
        formatOption={formatUserTagVariant}
        value={selected}
        onChange={(selectedValue) =>
          onChange(((selectedValue as UserTagVariant[] | null) ?? []).map((variant) => variant.id))
        }
        {...rest}
        multiple
      />
    );
  }

  const { value, onChange, nodeId: _nodeId, ...rest } = props;
  const variants = userTagVariants ?? [];
  const selected = variants.find((variant) => variant.id === value) ?? null;

  return (
    <Select
      loading={isLoading}
      multiple={false}
      options={variants}
      formatOption={formatUserTagVariant}
      value={selected}
      onChange={(selectedValue) => onChange((selectedValue as UserTagVariant | null)?.id ?? null)}
      {...rest}
    />
  );
}
