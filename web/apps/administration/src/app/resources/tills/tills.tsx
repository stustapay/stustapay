import { Resource, TextField, SimpleShowLayout, NumberField } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="tills" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NumberField source="z_nr" />
        <TextField source="current_cash_register_name" />
        <NumberField source="current_cash_register_balance" options={{ style: "currency", currency: "EUR" }} />
        <NodeReferenceField source="terminal_id" reference="terminals" />
        <NodeReferenceField source="active_profile_id" reference="till_profiles" />
        <NodeReferenceField source="active_user_id" reference="users" />
        <NodeReferenceField source="tse_id" reference="tses" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="tills" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <NodeReferenceField source="active_profile_id" reference="till_profiles" />
        <NodeReferenceField source="terminal_id" reference="terminals" />
        <NodeReferenceField source="active_user_id" reference="users" />
        <NodeReferenceField source="tse_id" reference="tses" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillResource = <Resource name="tills" />;
