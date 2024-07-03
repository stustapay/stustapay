import { ListLayout } from "@/components";
import { DataGrid, GridColDef, GridColumnTypes } from "@mui/x-data-grid";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { FieldConfig, FieldType, ResourceDefinition } from "./resource";
import useSWR from "swr";
import { fetcher } from "./fetcher";
import { TFunction } from "i18next";

export type ListViewProps<ValueType> = {
  resource: ResourceDefinition<ValueType>;
};

const mapFieldTypeToColType = (type: FieldType): keyof GridColumnTypes => {
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

function createColumnDefinitions<ValueType>(t: TFunction, resource: ResourceDefinition<ValueType>): GridColDef[] {
  return Object.entries(resource.fields)
    .filter(([fieldName, fieldConfig]) => {
      return (
        !(fieldConfig as FieldConfig).hidden &&
        !(resource.listViewConfig?.hiddenFields as string[] | undefined)?.includes(fieldName)
      );
    })
    .map(([fieldName, fieldConfig]): GridColDef => {
      const { label, type } = fieldConfig as FieldConfig;
      return {
        field: fieldName,
        headerName: label ? (t(label) as string) : fieldName,
        type: mapFieldTypeToColType(type),
      };
    });
}

export function ListView<ValueType>({ resource }: ListViewProps<ValueType>) {
  const { t } = useTranslation();
  const { data } = useSWR(resource.listFetchConfig.url, fetcher);

  const columns = React.useMemo(() => {
    return createColumnDefinitions(t, resource);
  }, [t, resource]);

  console.log(data?.entities, columns);

  return (
    <ListLayout title={t(resource.name, { count: 2 })}>
      <DataGrid
        autoHeight
        rows={data?.entities ? Object.values(data.entities) : []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
    </ListLayout>
  );
}
