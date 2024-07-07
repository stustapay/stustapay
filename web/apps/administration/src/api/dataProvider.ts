import { store } from "@/store";
import { stringify } from "query-string";
import {
  CreateParams,
  DataProvider,
  DeleteManyParams,
  DeleteParams,
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  Options,
  QueryFunctionContext,
  UpdateManyParams,
  UpdateParams,
  fetchUtils,
} from "react-admin";
import { adminApiBaseUrl } from "./common";

const httpClient = (url: string, options: Options = {}) => {
  const token = store.getState().auth.token;
  if (token) {
    options.user = {
      authenticated: true,
      token: `Bearer ${token}`,
    };
  }
  return fetchUtils.fetchJson(url, options);
};
const countHeader = "Content-Range";

const nodeUrlBaseRegex = /^#\/nodes\/(?<nodeId>[\d]+)/;

const updateQueryFromLocation = (query: URLSearchParams) => {
  if (!query.has("node_id")) {
    const match = window.location.hash.match(nodeUrlBaseRegex);
    if (match) {
      query.append("node_id", match[1]);
    }
  }
};

const applyFilterExpr = (fieldName: string, filterValue: any, elem: Record<string, any>): boolean => {
  if (!(fieldName in elem)) {
    return true;
  }
  if (filterValue === null) {
    return elem[fieldName] === null;
  }
  if (typeof filterValue !== "string") {
    console.warn("Filter values of type !== string are not supported currently");
    return true;
  }
  const fieldValue = elem[fieldName];
  if (typeof fieldValue === "string") {
    return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
  }

  if (typeof fieldValue === "number") {
    if (isNaN(Number(filterValue))) {
      return false;
    }

    return fieldValue === Number(filterValue);
  }
  return false;
};

const applyFullTextFilterExpr = (filterValue: string, elem: object): boolean => {
  for (const fieldValue of Object.values(elem)) {
    if (typeof fieldValue === "string" && fieldValue.toLowerCase().includes(filterValue.toLowerCase())) {
      return true;
    }
  }
  return false;
};

const applyFilterToResult = (filter: GetListParams["filter"], data: Array<any>) => {
  console.log("filter params", filter);
  if (!filter) {
    return data;
  }
  return data.filter((elem) => {
    if ("q" in filter) {
      if (!applyFullTextFilterExpr(filter["q"], elem)) {
        return false;
      }
    }

    for (const [field, fieldValue] of Object.entries(filter)) {
      if (!applyFilterExpr(field, fieldValue, elem)) {
        return false;
      }
    }

    return true;
  });
};

class SSPDataProvider implements DataProvider {
  async getList(resource: string, params: GetListParams & QueryFunctionContext) {
    const query = new URLSearchParams();
    const headers = new Headers();
    if (params.sort) {
      const { field, order } = params.sort;
      query.append("sort", JSON.stringify([field, order]));
    }

    if (params.pagination) {
      const { page, perPage } = params.pagination;

      const rangeStart = (page - 1) * perPage;
      const rangeEnd = page * perPage - 1;
      query.append("range", JSON.stringify([rangeStart, rangeEnd]));
      headers.append("Range", `${resource}=${rangeStart}-${rangeEnd}`);
    }

    if (params.filter) {
      if ("nodeId" in params.filter) {
        query.append("node_id", params.filter["nodeId"]);
        delete params.filter["nodeId"];
      }
    }
    updateQueryFromLocation(query);

    const url = `${adminApiBaseUrl}/${resource}?${query.toString()}`;
    const options = {
      // Chrome doesn't return `Content-Range` header if no `Range` is provided in the request.
      headers,
      signal: params?.signal,
    };

    const { headers: responseHeaders, json } = await httpClient(url, options);
    const countHeaderValue = responseHeaders.get(countHeader);
    if (countHeaderValue == null) {
      throw new Error(
        `The ${countHeader} header is missing in the HTTP Response. The simple REST data provider expects responses for lists of resources to contain this header with the total number of results to build the pagination. If you are using CORS, did you declare ${countHeader} in the Access-Control-Expose-Headers header?`
      );
    }
    return {
      data: applyFilterToResult(params.filter, json),
      total: parseInt(countHeaderValue.split("/")[0], 10),
    };
  }

  async getOne(resource: string, params: GetOneParams & QueryFunctionContext) {
    const { json } = await httpClient(`${adminApiBaseUrl}/${resource}/${params.id}?node_id=1001`, {
      signal: params?.signal,
    });
    return {
      data: json,
    };
  }

  async getMany(resource: string, params: GetManyParams & QueryFunctionContext) {
    console.log("getMany", params);
    const ids = params.ids;
    const all = await this.getList(resource, { signal: params?.signal });

    const filtered = (all.data as Array<{ id: number }>).filter((elem) => ids.includes(elem.id));
    return { data: filtered as any[] };
  }

  async getManyReference(resource: string, params: GetManyReferenceParams & QueryFunctionContext) {
    console.log("getManyReference", params);
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    const rangeStart = (page - 1) * perPage;
    const rangeEnd = page * perPage - 1;

    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify({
        ...params.filter,
        [params.target]: params.id,
      }),
    };
    const url = `${adminApiBaseUrl}/${resource}?${stringify(query)}`;
    const options = {
      // Chrome doesn't return `Content-Range` header if no `Range` is provided in the request.
      headers: new Headers({
        Range: `${resource}=${rangeStart}-${rangeEnd}`,
      }),
      signal: params?.signal,
    };

    const { headers, json } = await httpClient(url, options);
    const countHeaderValue = headers.get(countHeader);
    if (countHeaderValue == null) {
      throw new Error(
        `The ${countHeader} header is missing in the HTTP Response. The simple REST data provider expects responses for lists of resources to contain this header with the total number of results to build the pagination. If you are using CORS, did you declare ${countHeader} in the Access-Control-Expose-Headers header?`
      );
    }
    return {
      data: json,
      total: parseInt(countHeaderValue.split("/")[0], 10),
    };
  }

  async update(resource: string, params: UpdateParams) {
    const query = new URLSearchParams();
    updateQueryFromLocation(query);
    console.log("update", resource, params, query);
    const { json } = await httpClient(`${adminApiBaseUrl}/${resource}/${params.id}?${query.toString()}`, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  }

  // simple-rest doesn't handle provide an updateMany route, so we fallback to calling update n times instead
  async updateMany(resource: string, params: UpdateManyParams) {
    const query = new URLSearchParams();
    updateQueryFromLocation(query);
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${adminApiBaseUrl}/${resource}/${id}?${query.toString()}`, {
          method: "PUT",
          body: JSON.stringify(params.data),
        })
      )
    );
    return {
      data: responses.map(({ json }) => json.id),
    };
  }

  async create(resource: string, params: CreateParams) {
    const query = new URLSearchParams();
    updateQueryFromLocation(query);
    const { json } = await httpClient(`${adminApiBaseUrl}/${resource}?${query.toString()}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  }

  async delete(resource: string, params: DeleteParams) {
    const query = new URLSearchParams();
    updateQueryFromLocation(query);
    const { json } = await httpClient(`${adminApiBaseUrl}/${resource}/${params.id}?${query.toString()}`, {
      method: "DELETE",
      headers: new Headers({
        "Content-Type": "text/plain",
      }),
    });
    return { data: json };
  }

  // simple-rest doesn't handle filters on DELETE route, so we fallback to calling DELETE n times instead
  async deleteMany(resource: string, params: DeleteManyParams) {
    const query = new URLSearchParams();
    updateQueryFromLocation(query);
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${adminApiBaseUrl}/${resource}/${id}?${query.toString()}`, {
          method: "DELETE",
          headers: new Headers({
            "Content-Type": "text/plain",
          }),
        })
      )
    );
    return {
      data: responses.map(({ json }) => json.id),
    };
  }
}

export const dataProvider = new SSPDataProvider();
