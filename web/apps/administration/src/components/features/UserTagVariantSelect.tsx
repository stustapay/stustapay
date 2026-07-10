import { Select, SelectProps } from "@stustapay/components";
import * as React from "react";

import { UserTagVariant, selectUserTagVariantAll, useListUserTagVariantsQuery } from "@/api";
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
  const { userTagVariants, isLoading } = useListUserTagVariantsQuery(
    { nodeId },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userTagVariants: data ? selectUserTagVariantAll(data) : [],
      }),
    }
  );

  if (props.multiple) {
    const { value, onChange, nodeId: _nodeId, ...rest } = props;
    const selected = userTagVariants.filter((variant) => value.includes(variant.id));

    return (
      <Select
        checkboxes
        loading={isLoading}
        options={userTagVariants}
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
  const selected = userTagVariants.find((variant) => variant.id === value) ?? null;

  return (
    <Select
      loading={isLoading}
      multiple={false}
      options={userTagVariants}
      formatOption={formatUserTagVariant}
      value={selected}
      onChange={(selectedValue) => onChange((selectedValue as UserTagVariant | null)?.id ?? null)}
      {...rest}
    />
  );
}
