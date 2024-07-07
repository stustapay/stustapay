import { Resource, TextField, SimpleShowLayout, BooleanField, SimpleForm, TextInput, required } from "react-admin";
import { useParams } from "react-router-dom";
import {
  NodeReferenceField,
  NodeReferenceInput,
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceEdit,
  NodeResourceList,
  NodeResourceShow,
} from "./components";
import { Box, Grid, Typography } from "@mui/material";
import QRCode from "react-qr-code";
import { encodeTerminalRegistrationQrCode } from "@/core";
import { config } from "@/api/common";

const TerminalForm = () => {
  return (
    <SimpleForm>
      <TextInput source="name" validate={required()} />
      <TextInput source="description" />
      <NodeReferenceInput source="till_id" reference="tills" filter={{ terminal_id: null }} />
    </SimpleForm>
  );
};

export const TerminalCreate = () => {
  return (
    <NodeResourceCreate resource="terminals">
      <TerminalForm />
    </NodeResourceCreate>
  );
};

export const TerminalEdit = () => {
  const { id } = useParams();
  return (
    <NodeResourceEdit resource="terminals" id={id}>
      <TerminalForm />
    </NodeResourceEdit>
  );
};

export const TerminalShow = () => {
  const { id } = useParams();

  return (
    <NodeResourceShow resource="terminals" id={id}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="description" />
            <TextField source="session_uuid" />
            <TextField source="registration_uuid" />
            <NodeReferenceField source="till_id" reference="tills" />
            <BooleanField source="is_registered" />
          </SimpleShowLayout>
        </Grid>
        <Grid item xs={6}>
          <Typography>Registration QR Code</Typography>
          <Box
            sx={{
              padding: 2,
              backgroundColor: "white",
              height: "auto",
              margin: "0 auto",
              maxWidth: "20em",
              width: "100%",
              mt: 2,
            }}
          >
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={encodeTerminalRegistrationQrCode(config.terminalApiBaseUrl, "asdf")}
              viewBox={`0 0 256 256`}
            />
          </Box>
        </Grid>
      </Grid>
    </NodeResourceShow>
  );
};

export const TerminalList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="terminals" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <BooleanField source="is_registered" />
        <NodeReferenceField source="till_id" reference="tills" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const terminalResource = <Resource name="terminals" />;
