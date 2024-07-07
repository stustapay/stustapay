import { TaxRate } from "@/api";
import { List, Resource, TextField, NumberField, Show, SimpleShowLayout, Create, SimpleForm } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeResourceDatagrid } from "./components";

export const TaxRateCreate = () => {
  return (
    <Create resource="tax_rates">
      <SimpleForm>
        <TextField source="name" />
        <TextField source="description" />
        <NumberField source="rate" options={{ style: "percent" }} />
      </SimpleForm>
    </Create>
  );
};

export const TaxRateShow = () => {
  const { id } = useParams();

  return (
    <Show resource="tax_rates" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NumberField source="rate" options={{ style: "percent" }} />
      </SimpleShowLayout>
    </Show>
  );
};

export const TaxRateList = () => {
  const { nodeId } = useParams();
  return (
    <List resource="tax_rates" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NumberField source="rate" options={{ style: "percent" }} />
      </NodeResourceDatagrid>
    </List>
  );
};

export const taxRateResource = (
  <Resource
    name="tax_rates"
    recordRepresentation={(taxRate: TaxRate) => `${(taxRate.rate * 100).toFixed(2)}% (${taxRate.name})`}
  />
);
