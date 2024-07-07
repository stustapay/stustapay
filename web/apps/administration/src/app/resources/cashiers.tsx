import { Resource, TextField, SimpleShowLayout, ReferenceArrayField } from "react-admin";
import { useParams } from "react-router-dom";
import {
  CurrencyField,
  NodeReferenceField,
  NodeResourceDatagrid,
  NodeResourceList,
  NodeResourceShow,
} from "./components";

export const CashierShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="cashiers" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="login" />
        <TextField source="display_name" />
        <TextField source="description" />
        <NodeReferenceField source="cash_register_id" reference="till_registers" />
        <CurrencyField source="cash_drawer_balance" />
        <NodeReferenceField source="user_tag_id" reference="user_tags" />
        <ReferenceArrayField source="till_ids" reference="tills" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const CashierList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="cashiers" filter={{ nodeId }}>
      <NodeResourceDatagrid hideActions>
        <TextField source="id" />
        <TextField source="login" />
        <TextField source="display_name" />
        <NodeReferenceField source="cash_register_id" reference="till_registers" />
        <CurrencyField source="cash_drawer_balance" />
        <NodeReferenceField source="user_tag_id" reference="user_tags" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const cashierResource = <Resource name="cashiers" />;
