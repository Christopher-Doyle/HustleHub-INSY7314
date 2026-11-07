# HustleHub+ · INSY7314 Final POE

HustleHub+ is a MERN freelance marketplace. Freelancers publish gigs and clients book them. A booking creates a simulated transaction, which feeds the freelancer's income and estimated-tax dashboard.

## Run the full stack

From the repository root, with Node.js 24, npm, OpenSSL and Docker Compose available:

```sh
cd HustleHub
npm run setup
docker compose up --build --wait
```

Open [the local app](https://localhost:5173) or check [the API through Nginx](https://localhost:5173/api/health). Setup creates a local development certificate. The stack uses its own MongoDB container. Run `docker compose down` to stop the stack while keeping its database volume.

## Part 3 submission evidence

- [Full project README](HustleHub/README.md) covers setup, architecture, tax assumptions, logging and the final security review.
- [Implementation checklist](HustleHub/docs/PART3-IMPLEMENTATION-CHECKLIST.md) maps the rubric to implementation and verified results.
- [GitHub Actions on main](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions?query=branch%3Amain) contains the test, build, Docker smoke and Semgrep runs.
- [Static-analysis report](HustleHub/evidence/part3-static-analysis.md) explains the rules and links the JSON artifact.
- [Demonstration guide](HustleHub/docs/PART3-DEMO-GUIDE.md) gives the recording sequence. The final video link and live cloud-receipt evidence are pending.
