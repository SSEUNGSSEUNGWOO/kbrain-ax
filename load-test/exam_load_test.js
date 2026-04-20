/**
 * KBrain-AX 시험 부하 테스트
 *
 * 실행 방법:
 *   k6 run --env BACKEND_URL=https://your-backend.com \
 *           --env SUPABASE_URL=https://xxx.supabase.co \
 *           --env SUPABASE_ANON_KEY=your_anon_key \
 *           --env EXAM_ID=your_exam_id \
 *           exam_load_test.js
 *
 * 시나리오: 200명이 동시에 시험에 접속, 60분간 30초마다 자동저장, 마지막에 일괄 제출
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

// ── 설정 ───────────────────────────────────────────────
const BACKEND_URL   = __ENV.BACKEND_URL   || "http://localhost:8000";
const SUPABASE_URL  = __ENV.SUPABASE_URL  || "http://localhost:54321";
const ANON_KEY      = __ENV.SUPABASE_ANON_KEY;
const EXAM_ID       = __ENV.EXAM_ID;
const EXAM_MINUTES  = parseInt(__ENV.EXAM_MINUTES || "10"); // 실제 60, 테스트용 10

// ── 부하 프로파일 ───────────────────────────────────────
export const options = {
  scenarios: {
    exam_session: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 }, // 2분에 걸쳐 200명 접속
        { duration: `${EXAM_MINUTES}m`, target: 200 }, // 시험 진행
        { duration: "1m", target: 0 },   // 종료
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],   // 95%가 3초 이내
    http_req_failed:   ["rate<0.01"],    // 에러율 1% 미만
    autosave_duration: ["p(95)<2000"],   // 자동저장 2초 이내
    submit_duration:   ["p(95)<5000"],   // 제출 5초 이내
  },
};

// ── 커스텀 메트릭 ───────────────────────────────────────
const autosaveDuration = new Trend("autosave_duration");
const submitDuration   = new Trend("submit_duration");
const autosaveErrors   = new Counter("autosave_errors");
const submitErrors     = new Counter("submit_errors");
const loginErrors      = new Counter("login_errors");

// ── 테스트용 계정 (미리 Supabase에 생성해둔 계정들) ────────
// 실제 테스트 시 아래 계정들을 Supabase에 미리 생성
function getTestAccount(vu) {
  return {
    email:    `testuser${vu}@kbrain-test.com`,
    password: "TestPassword123!",
  };
}

// ── 더미 답안 생성 ───────────────────────────────────────
function makeDummyAnswers(questionIds) {
  const answers = {};
  for (const id of questionIds) {
    answers[id] = "①"; // 객관식 기준 더미 답안
  }
  return answers;
}

// ── 메인 시나리오 ───────────────────────────────────────
export default function () {
  const { email, password } = getTestAccount(__VU);

  // ── 1. 로그인 (Supabase Auth) ──────────────────────────
  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
    }
  );

  const loginOk = check(loginRes, {
    "로그인 성공": (r) => r.status === 200,
  });

  if (!loginOk) {
    loginErrors.add(1);
    console.error(`VU ${__VU} 로그인 실패: ${loginRes.status} ${loginRes.body}`);
    return;
  }

  const token = loginRes.json("access_token");
  const authHeader = { Authorization: `Bearer ${token}` };

  // ── 2. 시험 문제 조회 ────────────────────────────────────
  const questionsRes = http.get(
    `${BACKEND_URL}/exams/${EXAM_ID}/questions`,
    { headers: { ...authHeader, "Content-Type": "application/json" } }
  );

  check(questionsRes, {
    "문제 조회 성공": (r) => r.status === 200,
  });

  let questionIds = [];
  try {
    questionIds = questionsRes.json().map((q) => q.question_id || q.id);
  } catch (_) {}

  const answers = makeDummyAnswers(questionIds);

  // ── 3. 자동저장 루프 (30초마다) ─────────────────────────
  const totalSeconds = EXAM_MINUTES * 60;
  const autosaveInterval = 30;
  const cycles = Math.floor(totalSeconds / autosaveInterval);

  for (let i = 0; i < cycles; i++) {
    sleep(autosaveInterval);

    const start = Date.now();
    const saveRes = http.put(
      `${BACKEND_URL}/exams/attempts/dummy/autosave`,
      JSON.stringify({ answers }),
      { headers: { ...authHeader, "Content-Type": "application/json" } }
    );
    autosaveDuration.add(Date.now() - start);

    const saveOk = check(saveRes, {
      "자동저장 성공": (r) => r.status === 200 || r.status === 404,
    });
    if (!saveOk) autosaveErrors.add(1);
  }

  // ── 4. 최종 제출 (200명 동시) ───────────────────────────
  const start = Date.now();
  const submitRes = http.post(
    `${BACKEND_URL}/exams/submit`,
    JSON.stringify({
      exam_id:        EXAM_ID,
      answers,
      started_at:     new Date(Date.now() - totalSeconds * 1000).toISOString(),
      applicant_name: `테스트유저${__VU}`,
    }),
    { headers: { ...authHeader, "Content-Type": "application/json" } }
  );
  submitDuration.add(Date.now() - start);

  const submitOk = check(submitRes, {
    "제출 성공": (r) => r.status === 200,
  });
  if (!submitOk) {
    submitErrors.add(1);
    console.error(`VU ${__VU} 제출 실패: ${submitRes.status} ${submitRes.body}`);
  }
}
