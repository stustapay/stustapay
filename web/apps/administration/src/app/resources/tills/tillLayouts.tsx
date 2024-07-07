import { Resource, TextField, SimpleShowLayout } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillLayoutShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="till_layouts" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillLayoutList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="till_layouts" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillLayoutResource = <Resource name="till_layouts" />;
