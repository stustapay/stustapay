import { Resource, TextField, SimpleShowLayout, NumberField, ReferenceArrayField, BooleanField } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillButtonShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="till_buttons" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NumberField source="price" options={{ style: "currency", currency: "EUR" }} />
        <ReferenceArrayField reference="products" source="product_ids">
          <NodeResourceDatagrid hideActions>
            <TextField source="id" />
            <TextField source="name" />
            <BooleanField source="fixed_price" />
            <NodeReferenceField source="tax_rate_id" reference="tax_rates" />
            <NumberField source="price_in_vouchers" />
            <NumberField source="price" options={{ style: "currency", currency: "EUR" }} />
          </NodeResourceDatagrid>
        </ReferenceArrayField>
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillButtonList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="till_buttons" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <ReferenceArrayField reference="products" source="product_ids" />
        <NumberField source="price" options={{ style: "currency", currency: "EUR" }} />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillButtonResource = <Resource name="till_buttonss" />;
