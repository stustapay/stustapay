import { Resource, TextField, SimpleShowLayout } from "react-admin";
import { useParams } from "react-router-dom";
import { NodeReferenceField, NodeResourceDatagrid, NodeResourceList, NodeResourceShow } from "../components";

export const TillProfileShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="till_profiles" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NodeReferenceField source="layout_id" reference="till_layouts" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TillProfileList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="till_profiles" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="description" />
        <NodeReferenceField source="layout_id" reference="till_layouts" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tillProfileResource = <Resource name="till_profiless" />;
