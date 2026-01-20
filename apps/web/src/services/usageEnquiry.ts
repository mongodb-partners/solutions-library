/**
 * Usage Enquiry API Service
 * Handles submission of usage enquiries for demo tracking.
 */

export interface UsageEnquiryData {
  name: string;
  email: string;
  company: string;
  role: string;
  solution_id: string;
  solution_name: string;
  skipped?: boolean;
}

export interface UsageEnquiryResponse {
  enquiry_id: string;
  message: string;
}

const API_BASE_URL = '/api/admin/public';

/**
 * Submit a usage enquiry to track demo usage.
 * @param data - The enquiry data to submit
 * @returns The response from the API
 */
export async function submitUsageEnquiry(
  data: UsageEnquiryData
): Promise<UsageEnquiryResponse> {
  const response = await fetch(`${API_BASE_URL}/usage-enquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit enquiry: ${response.status}`);
  }

  return response.json();
}
