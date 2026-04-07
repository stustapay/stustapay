import {
  UserTagSwapCandidate,
  useFindCustomerTagSwapCandidatesMutation,
  useSwapCustomerTagMutation,
} from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { CustomerRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrentNode, useDebounce } from "@/hooks";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const formatCandidateLabel = (candidate: UserTagSwapCandidate, t: (key: string, options?: object) => string) => {
  const parts = [candidate.pin];

  if (candidate.uid != null) {
    parts.push(formatUserTagUid(candidate.uid.toString(16).toUpperCase()));
  }

  if (candidate.comment) {
    parts.push(candidate.comment);
  }

  if (candidate.account_id != null) {
    parts.push(t("customer.tagSwap.accountLabel", { accountId: candidate.account_id }));
  }

  return parts.join(" | ");
};

const getTargetStatusLabel = (candidate: UserTagSwapCandidate, t: (key: string) => string) => {
  if (candidate.target_mode === "reuse_stub") {
    return t("customer.tagSwap.status.reuseStub");
  }

  if (candidate.target_mode === "unavailable") {
    return t("customer.tagSwap.status.unavailable");
  }

  return t("customer.tagSwap.status.direct");
};

const getTargetReasonLabel = (candidate: UserTagSwapCandidate, t: (key: string) => string) => {
  if (!candidate.target_reason) {
    return "";
  }

  return t(`customer.tagSwap.reason.${candidate.target_reason}`);
};

const isSelectableTarget = (candidate: UserTagSwapCandidate | null) => {
  return candidate != null && candidate.target_mode !== "unavailable";
};

export const CustomerTagSwap = withPrivilegeGuard(CustomerRoutes.privilege, () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [sourceSearch, setSourceSearch] = React.useState("");
  const [targetSearch, setTargetSearch] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [blockSourceTag, setBlockSourceTag] = React.useState(true);
  const [sourceTag, setSourceTag] = React.useState<UserTagSwapCandidate | null>(null);
  const [targetTag, setTargetTag] = React.useState<UserTagSwapCandidate | null>(null);
  const [sourceOptions, setSourceOptions] = React.useState<UserTagSwapCandidate[]>([]);
  const [targetOptions, setTargetOptions] = React.useState<UserTagSwapCandidate[]>([]);

  const debouncedSourceSearch = useDebounce(sourceSearch, 350);
  const debouncedTargetSearch = useDebounce(targetSearch, 350);

  const [findSourceCandidates, sourceSearchState] = useFindCustomerTagSwapCandidatesMutation();
  const [findTargetCandidates, targetSearchState] = useFindCustomerTagSwapCandidatesMutation();
  const [swapCustomerTag, swapCustomerTagState] = useSwapCustomerTagMutation();
  const formatLabel = React.useCallback(
    (candidate: UserTagSwapCandidate) => formatCandidateLabel(candidate, t),
    [t]
  );

  React.useEffect(() => {
    const searchTerm = debouncedSourceSearch.trim();
    if (searchTerm === "") {
      setSourceOptions(sourceTag == null ? [] : [sourceTag]);
      return;
    }

    let cancelled = false;

    findSourceCandidates({
      nodeId: currentNode.id,
      findTagSwapCandidatesPayload: { search_term: searchTerm, mode: "source" },
    })
      .unwrap()
      .then((result) => {
        if (!cancelled) {
          setSourceOptions(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentNode.id, debouncedSourceSearch, findSourceCandidates, sourceTag]);

  React.useEffect(() => {
    const searchTerm = debouncedTargetSearch.trim();
    if (searchTerm === "") {
      setTargetOptions(targetTag == null ? [] : [targetTag]);
      return;
    }

    let cancelled = false;

    findTargetCandidates({
      nodeId: currentNode.id,
      findTagSwapCandidatesPayload: { search_term: searchTerm, mode: "target" },
    })
      .unwrap()
      .then((result) => {
        if (!cancelled) {
          setTargetOptions(result.filter(isSelectableTarget));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTargetOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentNode.id, debouncedTargetSearch, findTargetCandidates, targetTag]);

  const selectedTargetReason = targetTag == null ? "" : getTargetReasonLabel(targetTag, t);
  const selectedTargetStatus = targetTag == null ? "" : getTargetStatusLabel(targetTag, t);
  const canSubmit =
    sourceTag != null &&
    targetTag != null &&
    isSelectableTarget(targetTag) &&
    sourceTag.user_tag_id !== targetTag.user_tag_id &&
    !swapCustomerTagState.isLoading;

  const handleSourceSelection = (_: React.SyntheticEvent, value: UserTagSwapCandidate | null) => {
    setSourceTag(value);
    setSourceSearch(value == null ? "" : formatLabel(value));
    setSourceOptions(value == null ? [] : [value]);
  };

  const handleTargetSelection = (_: React.SyntheticEvent, value: UserTagSwapCandidate | null) => {
    setTargetTag(value);
    setTargetSearch(value == null ? "" : formatLabel(value));
    setTargetOptions(value == null ? [] : [value]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sourceTag || !targetTag || !isSelectableTarget(targetTag) || sourceTag.user_tag_id === targetTag.user_tag_id) {
      return;
    }

    try {
      const result = await swapCustomerTag({
        nodeId: currentNode.id,
        swapCustomerTagPayload: {
          source_user_tag_id: sourceTag.user_tag_id,
          target_user_tag_id: targetTag.user_tag_id,
          comment,
          block_source_tag: blockSourceTag,
        },
      }).unwrap();

      toast.success(
        t("customer.tagSwap.success", {
          accountId: result.customer_account_id,
        })
      );

      navigate(CustomerRoutes.detail(result.customer_account_id, currentNode.id));
    } catch (error: any) {
      toast.error(error?.data?.detail ?? t("customer.tagSwap.submitFailed"));
    }
  };

  return (
    <DetailLayout title={t("customer.tagSwap.title")} routes={CustomerRoutes}>
      <Stack spacing={3}>
        <Alert severity="info">{t("customer.tagSwap.description")}</Alert>
        <Paper sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Autocomplete<UserTagSwapCandidate, false, false, false>
                options={sourceOptions}
                value={sourceTag}
                inputValue={sourceSearch}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") {
                    setSourceTag(null);
                    setSourceSearch(value);
                  }

                  if (reason === "clear") {
                    setSourceTag(null);
                    setSourceSearch(value);
                  }

                  if (reason === "reset") {
                    setSourceSearch(value);
                  }
                }}
                onChange={handleSourceSelection}
                isOptionEqualToValue={(option, value) => option.user_tag_id === value.user_tag_id}
                filterOptions={(options) => options}
                loading={sourceSearchState.isLoading}
                getOptionLabel={formatLabel}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("customer.tagSwap.sourceLabel")}
                    placeholder={t("customer.tagSwap.searchPlaceholder")}
                    inputProps={{
                      ...params.inputProps,
                      "data-testid": "customer-tag-swap-source-input",
                    }}
                    helperText={
                      sourceSearchState.isError ? t("customer.tagSwap.searchFailed") : t("customer.tagSwap.sourceHelp")
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {sourceSearchState.isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;

                  return (
                    <Box component="li" key={key} {...optionProps}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{formatCandidateLabel(option, t)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("customer.tagSwap.sourceCandidateHint")}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                }}
              />

              <Autocomplete<UserTagSwapCandidate, false, false, false>
                options={targetOptions}
                value={targetTag}
                inputValue={targetSearch}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") {
                    setTargetTag(null);
                    setTargetSearch(value);
                  }

                  if (reason === "clear") {
                    setTargetTag(null);
                    setTargetSearch(value);
                  }

                  if (reason === "reset") {
                    setTargetSearch(value);
                  }
                }}
                onChange={handleTargetSelection}
                isOptionEqualToValue={(option, value) => option.user_tag_id === value.user_tag_id}
                filterOptions={(options) => options}
                loading={targetSearchState.isLoading}
                getOptionLabel={formatLabel}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("customer.tagSwap.targetLabel")}
                    placeholder={t("customer.tagSwap.searchPlaceholder")}
                    inputProps={{
                      ...params.inputProps,
                      "data-testid": "customer-tag-swap-target-input",
                    }}
                    helperText={
                      targetSearchState.isError ? t("customer.tagSwap.searchFailed") : t("customer.tagSwap.targetHelp")
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {targetSearchState.isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;

                  return (
                    <Box component="li" key={key} {...optionProps}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{formatCandidateLabel(option, t)}</Typography>
                        <Typography
                          variant="caption"
                          color={option.target_mode === "unavailable" ? "error.main" : "text.secondary"}
                        >
                          {getTargetStatusLabel(option, t)}
                          {option.target_reason ? ` - ${getTargetReasonLabel(option, t)}` : ""}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                }}
              />

              {targetTag != null && (
                <Alert severity={targetTag.target_mode === "unavailable" ? "warning" : "success"}>
                  {selectedTargetStatus}
                  {selectedTargetReason ? ` - ${selectedTargetReason}` : ""}
                </Alert>
              )}

              <TextField
                label={t("customer.tagSwap.commentLabel")}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                multiline
                minRows={3}
                inputProps={{ "data-testid": "customer-tag-swap-comment-input" }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={blockSourceTag}
                    onChange={(event) => setBlockSourceTag(event.target.checked)}
                  />
                }
                label={t("customer.tagSwap.blockSourceLabel")}
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="contained" disabled={!canSubmit}>
                  {t("customer.tagSwap.submit")}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </DetailLayout>
  );
});
