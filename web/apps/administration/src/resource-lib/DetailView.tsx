import { DetailLayout, ListLayout } from "@/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { FieldConfig, FieldType, ResourceDefinition } from "./resource";
import useSWR from "swr";
import { fetcher } from "./fetcher";
import { TFunction } from "i18next";
import { useParams } from "react-router-dom";

const mapFieldTypeToColType = (type: FieldType) => {
  switch (type) {
    case "double":
    case "int":
      return "number";
    case "enum":
      return "string";
    default:
      return type;
  }
};

export type DetailViewProps<ValueType> = {
  resource: ResourceDefinition<ValueType>;
};

export function DetailView<ValueType>({ resource }: DetailViewProps<ValueType>) {
  const { t } = useTranslation();
  const { elementId } = useParams();
  const { data } = useSWR(resource.detailFetchConfig.url(Number(elementId)), fetcher);

  return <DetailLayout title={t(resource.name, { count: 1 })}></DetailLayout>;
}
