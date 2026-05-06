const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "API 오류")
  }
  return res.json()
}

export const api = {
  applications: {
    list: () => request("/applications/"),
    get: (id: string) => request(`/applications/${id}`),
    create: (body: { selection_id: string; content: Record<string, unknown> }) =>
      request("/applications/", { method: "POST", body: JSON.stringify(body) }),
  },
  evaluations: {
    get: (applicationId: string) => request(`/evaluations/${applicationId}`),
    evaluate: (body: { application_id: string; rubric?: string }) =>
      request("/evaluations/", { method: "POST", body: JSON.stringify(body) }),
  },
  exams: {
    list: () => request("/exams/"),
    submitDirect: (body: { exam_id: string; answers: Record<string, string>; started_at: string; applicant_name: string }) =>
      request<{ score: number; is_passed: boolean }>("/exams/submit", { method: "POST", body: JSON.stringify(body) }),
    start: (exam_id: string) =>
      request("/exams/attempts/start", { method: "POST", body: JSON.stringify({ exam_id }) }),
    submit: (attempt_id: string, answers: Record<string, unknown>) =>
      request("/exams/attempts/submit", { method: "POST", body: JSON.stringify({ attempt_id, answers }) }),
    autosave: (attempt_id: string, answers: Record<string, unknown>) =>
      request(`/exams/attempts/${attempt_id}/autosave`, { method: "PUT", body: JSON.stringify({ answers }) }),
  },
}
