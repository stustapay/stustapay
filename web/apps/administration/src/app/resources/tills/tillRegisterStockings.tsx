import { Resource, TextField, SimpleShowLayout } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillRegisterStockingShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="till_register_stockings" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillRegisterStockingList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="till_register_stockings" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillRegisterStockingResource = <Resource name="till_register_stockings" />;
