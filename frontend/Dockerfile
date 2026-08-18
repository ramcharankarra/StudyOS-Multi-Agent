# Railway Dockerfile - Production Build with Google Client ID
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_GOOGLE_CLIENT_ID=664970311984-5dvjh1nhqc8q5he1tq1e6qedi159rusr.apps.googleusercontent.com
ARG VITE_GOOGLE_REDIRECT_URI=https://studyos-frontend-production.up.railway.app/auth/google/callback
ARG VITE_API_BASE_URL

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT}"]
