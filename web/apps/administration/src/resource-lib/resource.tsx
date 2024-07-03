import { DefaultNamespace, ParseKeys } from "i18next";
import { RouteObject } from "react-router-dom";
import { z } from "zod";
import { ListView } from "./ListView";
import { DetailView } from "./DetailView";

type TranslationKey = ParseKeys<DefaultNamespace, {}, undefined>;

type CommonFieldConfig = {
  label?: TranslationKey; // translationKey
  hidden?: boolean;
  optional?: boolean;
};

export type FieldConfig = CommonFieldConfig &
  (
    | {
        type: "boolean" | "string" | "double" | "int";
      }
    | {
        type: "enum";
        options: string[];
      }
  );
export type FieldType = FieldConfig["type"];

export type ListViewConfig<ValueType> = {
  hiddenFields: Array<keyof ValueType>;
};

export type DetailViewConfig<ValueType> = {
  hiddenFields: Array<keyof ValueType>;
};

export type ResourceAction = {};

export type FetchConfig = {
  url: string;
};

export type ResourceDefinition<ValueType> = {
  name: TranslationKey;
  // fields: {
  //   [field in keyof ValueType]: FieldConfig<ValueType, field>;
  // };
  fields: Partial<{
    [field in keyof ValueType]: FieldConfig;
  }>;

  listFetchConfig: { url: string };
  detailFetchConfig: { url: (id: number) => string };

  listViewConfig?: ListViewConfig<ValueType>;
  detailViewConfig?: DetailViewConfig<ValueType>;

  actions?: ResourceAction[];
};

export type FormDefinition = {};

export function createRoutes<ValueType>(resource: ResourceDefinition<ValueType>): RouteObject[] {
  return [
    {
      index: true,
      element: <ListView resource={resource} />,
    },
    {
      path: ":elementId",
      element: <DetailView resource={resource} />,
    },
  ];
}
