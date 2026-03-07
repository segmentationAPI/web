import { API_BASE_URL, ASSETS_BASE_URL } from "./constants";
import { toJobStatus } from "./mappers/job-status.mapper";
import {
  AccountResponseSchema,
  type JobListResponse,
  JobListResponseSchema,
  JobRequestSchema,
  JobResponseSchema,
  JobStatusResponseSchema,
  OutputManifestSchema,
  PresignRequestSchema,
  PresignResponseSchema,
} from "./schemas";
import type {
  AccountResponse,
  JobRequest,
  JobResponse,
  JobStatus,
  JobStatusResponse,
  ListJobsParams,
  OutputManifest,
  PresignRequest,
  PresignResponse,
} from "./types";
import { getRequest, postRequest } from "./utils";

export class SegmentationClient {
  private apiKey: string;
  private accountId: string;

  private constructor(apiKey: string, accountId: string) {
    this.apiKey = apiKey;
    this.accountId = accountId;
  }

  static async create(apiKey: string): Promise<SegmentationClient> {
    const account = await SegmentationClient.getAccount(apiKey);
    return new SegmentationClient(apiKey, account.accountId);
  }

  private static async getAccount(apiKey: string): Promise<AccountResponse> {
    const url = `${API_BASE_URL}/account`;
    return getRequest({
      url,
      init: {
        headers: {
          "x-api-key": apiKey,
        },
      },
      responseSchema: AccountResponseSchema,
    });
  }

  async createJob(job: JobRequest): Promise<JobResponse> {
    const url = `${API_BASE_URL}/jobs`;
    return postRequest({
      url,
      init: {
        headers: {
          "x-api-key": this.apiKey,
        },
      },
      body: job,
      requestSchema: JobRequestSchema,
      responseSchema: JobResponseSchema,
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const url = `${API_BASE_URL}/jobs/${jobId}`;
    const result: JobStatusResponse = await getRequest({
      url,
      init: {
        headers: {
          "x-api-key": this.apiKey,
        },
      },
      responseSchema: JobStatusResponseSchema,
    });

    return toJobStatus(result);
  }

  async listJobs(params: ListJobsParams = {}): Promise<JobListResponse> {
    const url = `${API_BASE_URL}/jobs`;
    return getRequest({
      url,
      query: {
        limit: params.limit,
        nextToken: params.nextToken,
      },
      init: {
        headers: {
          "x-api-key": this.apiKey,
        },
      },
      responseSchema: JobListResponseSchema,
    });
  }

  async presign(request: PresignRequest): Promise<PresignResponse> {
    const url = `${API_BASE_URL}/uploads/presign`;
    return postRequest({
      url,
      init: {
        headers: {
          "x-api-key": this.apiKey,
        },
      },
      body: request,
      requestSchema: PresignRequestSchema,
      responseSchema: PresignResponseSchema,
    });
  }

  async getOutputManifest(jobId: string): Promise<OutputManifest> {
    const url = `${ASSETS_BASE_URL}/outputs/${this.accountId}/${jobId}/output_manifest.json`;
    return getRequest({
      url,
      init: {
        headers: {
          "x-api-key": this.apiKey,
        },
      },
      responseSchema: OutputManifestSchema,
    });
  }
}
