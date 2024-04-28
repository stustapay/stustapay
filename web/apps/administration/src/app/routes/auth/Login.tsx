import { useLoginMutation, UserLoginResult } from "@/api";
import { selectIsAuthenticated, useAppSelector } from "@/store";
import { LockOutlined as LockOutlinedIcon } from "@mui/icons-material";
import {
  Stack,
  Avatar,
  Button,
  Container,
  CssBaseline,
  LinearProgress,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";

const validationSchema = z.object({
  username: z.string(),
  password: z.string(),
});

type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
  username: "",
  password: "",
};

type NodeSelectInfo = {
  username: string;
  password: string;
  availableNodes: NonNullable<UserLoginResult["available_nodes"]>;
};

const SelectNode: React.FC<NodeSelectInfo> = ({ username, password, availableNodes }) => {
  const [login] = useLoginMutation();
  const { t } = useTranslation();

  const handleSelectNode = (nodeId: number) => {
    login({ loginPayload: { username, password, node_id: nodeId } })
      .unwrap()
      .catch((err) => {
        console.log(err);
        toast.error(t("auth.loginFailed", { reason: err.error }));
      });
  };

  return (
    <>
      <Typography component="h1" variant="h5">
        {t("auth.selectNode")}
      </Typography>
      <List sx={{ width: "100%" }}>
        {availableNodes.map((node, index) => (
          <ListItemButton
            key={node.node_id}
            onClick={() => handleSelectNode(node.node_id)}
            sx={{
              borderTop: index === 0 ? 1 : 0,
              borderRight: 1,
              borderLeft: 1,
              borderBottom: 1,
              borderColor: "grey.500",
            }}
          >
            <ListItemText primary={node.name} secondary={node.description} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
};

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsAuthenticated);
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const [login] = useLoginMutation();
  const [nodeSelectInfo, setNodeSelectInfo] = React.useState<NodeSelectInfo | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const next = query.get("next");
      const redirectUrl = next != null ? next : "/";
      navigate(redirectUrl);
    }
  }, [isLoggedIn, navigate, query]);

  const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
    setSubmitting(true);
    login({ loginPayload: { username: values.username, password: values.password, node_id: null } })
      .unwrap()
      .then((result: UserLoginResult) => {
        if (result.available_nodes) {
          setNodeSelectInfo({
            username: values.username,
            password: values.password,
            availableNodes: result.available_nodes,
          });
        }
        setSubmitting(false);
      })
      .catch((err) => {
        setSubmitting(false);
        console.log(err);
        toast.error(t("auth.loginFailed", { reason: err.error }));
      });
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Stack alignItems="center" justifyContent="center">
        <Avatar sx={{ margin: 1, backgroundColor: "primary.main" }}>
          <LockOutlinedIcon />
        </Avatar>

        {nodeSelectInfo ? (
          <SelectNode {...nodeSelectInfo} />
        ) : (
          <>
            <Typography component="h1" variant="h5">
              {t("auth.signIn")}
            </Typography>
            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              validationSchema={toFormikValidationSchema(validationSchema)}
            >
              {(formik) => (
                <Form onSubmit={formik.handleSubmit} style={{ width: "100%" }}>
                  <Stack spacing={2}>
                    <input type="hidden" name="remember" value="true" />
                    <FormTextField
                      variant="outlined"
                      autoFocus
                      type="text"
                      label={t("auth.username")}
                      name="username"
                      formik={formik}
                    />

                    <FormTextField
                      variant="outlined"
                      type="password"
                      name="password"
                      label={t("auth.password")}
                      formik={formik}
                    />

                    {formik.isSubmitting && <LinearProgress />}
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      color="primary"
                      disabled={formik.isSubmitting}
                      sx={{ mt: 1 }}
                    >
                      {t("auth.login")}
                    </Button>
                  </Stack>
                </Form>
              )}
            </Formik>
          </>
        )}
      </Stack>
    </Container>
  );
};
