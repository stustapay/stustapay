import { Resource, TextField, SimpleShowLayout } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillRegisterShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="till_registers" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillRegisterList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="till_registers" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillRegisterResource = <Resource name="till_registers" />;
