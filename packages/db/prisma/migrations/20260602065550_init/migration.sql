-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('BASIC_USER', 'MANAGER', 'DB_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'ERROR', 'SYNCING', 'PAUSED');

-- CreateEnum
CREATE TYPE "ConnectionMethod" AS ENUM ('DIRECT', 'SSH_TUNNEL');

-- CreateEnum
CREATE TYPE "LoadProfile" AS ENUM ('CONSERVATIVE', 'BALANCED', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "DescriptionSource" AS ENUM ('AI_GENERATED', 'HUMAN_WRITTEN', 'IMPORTED');

-- CreateEnum
CREATE TYPE "TableVisibility" AS ENUM ('PUBLIC', 'RESTRICTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SemanticType" AS ENUM ('UNKNOWN', 'EMAIL', 'PHONE', 'FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'ADDRESS', 'URL', 'CATEGORY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('MANAGER', 'TABLE_OWNER', 'DB_ADMIN');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('QUERY', 'CLARIFICATION_QUESTION', 'CLARIFICATION_ANSWER', 'UNDERSTANDING', 'RESULT', 'BLOCKED', 'ERROR');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('SUCCESS', 'BLOCKED_PERMISSION', 'SQL_ERROR', 'LLM_ERROR', 'VALIDATION_ERROR', 'IMPOSSIBLE', 'CLARIFICATION_NEEDED');

-- CreateEnum
CREATE TYPE "DownloadFormat" AS ENUM ('CSV', 'XLSX', 'JSON');

-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('LLM', 'EMBEDDING', 'EMAIL', 'STORAGE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    "fastQueries" INTEGER NOT NULL DEFAULT 0,
    "smartQueries" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmPricingConfig" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "pricePerToken" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmPricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "managerId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'BASIC_USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "TenantRole" NOT NULL DEFAULT 'BASIC_USER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER,
    "database" TEXT,
    "schema" TEXT,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "loadProfile" "LoadProfile" NOT NULL DEFAULT 'BALANCED',
    "queryRowLimit" INTEGER NOT NULL DEFAULT 50000,
    "queryTimeoutSeconds" INTEGER NOT NULL DEFAULT 60,
    "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 300,
    "dailyQueryCap" INTEGER DEFAULT 0,
    "crawlWindowStart" TEXT,
    "crawlWindowEnd" TEXT,
    "disclosureAcknowledgedAt" TIMESTAMP(3),
    "disclosureAcknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "descriptionSource" "DescriptionSource" NOT NULL,
    "descriptionApproved" BOOLEAN NOT NULL DEFAULT false,
    "rowCountEstimate" BIGINT,
    "visibility" "TableVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT,
    "embedding" vector(1536),
    "embeddingUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaColumn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "semanticType" "SemanticType" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "descriptionSource" "DescriptionSource" NOT NULL,
    "pii" BOOLEAN NOT NULL DEFAULT false,
    "valueDictionary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RowFilter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sqlFragment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RowFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableOwnership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableAccessGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "grantedToId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequestStage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "approverType" "ApproverType" NOT NULL,
    "assignedToId" TEXT,
    "note" TEXT,
    "isAdminOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequestStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuerySession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuerySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "type" "MessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryMessageTable" (
    "messageId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "join" TEXT,

    CONSTRAINT "QueryMessageTable_pkey" PRIMARY KEY ("messageId","tableId")
);

-- CreateTable
CREATE TABLE "QueryLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL,
    "executedSql" TEXT,
    "errorMessage" TEXT,
    "isImpersonated" BOOLEAN NOT NULL DEFAULT false,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "providerName" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpersonationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ImpersonationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "deletedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_domain_key" ON "TenantDomain"("domain");

-- CreateIndex
CREATE INDEX "UsageRecord_tenantId_month_idx" ON "UsageRecord"("tenantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "LlmPricingConfig_providerName_modelId_effectiveFrom_key" ON "LlmPricingConfig"("providerName", "modelId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "SchemaTable_tenantId_idx" ON "SchemaTable"("tenantId");

-- CreateIndex
CREATE INDEX "SchemaColumn_tenantId_idx" ON "SchemaColumn"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TableAccessGrant_tableId_grantedToId_key" ON "TableAccessGrant"("tableId", "grantedToId");

-- CreateIndex
CREATE INDEX "AccessRequest_tableId_status_idx" ON "AccessRequest"("tableId", "status");

-- CreateIndex
CREATE INDEX "AccessRequestStage_status_idx" ON "AccessRequestStage"("status");

-- CreateIndex
CREATE INDEX "QuerySession_tenantId_userId_idx" ON "QuerySession"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "QueryMessage_sessionId_idx" ON "QueryMessage"("sessionId");

-- CreateIndex
CREATE INDEX "QueryLog_tenantId_createdAt_idx" ON "QueryLog"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_tenantId_category_key" ON "ProviderConfig"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseConnection" ADD CONSTRAINT "DatabaseConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemaTable" ADD CONSTRAINT "SchemaTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemaTable" ADD CONSTRAINT "SchemaTable_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DatabaseConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemaColumn" ADD CONSTRAINT "SchemaColumn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemaColumn" ADD CONSTRAINT "SchemaColumn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RowFilter" ADD CONSTRAINT "RowFilter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RowFilter" ADD CONSTRAINT "RowFilter_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOwnership" ADD CONSTRAINT "TableOwnership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableOwnership" ADD CONSTRAINT "TableOwnership_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAccessGrant" ADD CONSTRAINT "TableAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAccessGrant" ADD CONSTRAINT "TableAccessGrant_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAccessGrant" ADD CONSTRAINT "TableAccessGrant_grantedToId_fkey" FOREIGN KEY ("grantedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequestStage" ADD CONSTRAINT "AccessRequestStage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuerySession" ADD CONSTRAINT "QuerySession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuerySession" ADD CONSTRAINT "QuerySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMessage" ADD CONSTRAINT "QueryMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuerySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMessageTable" ADD CONSTRAINT "QueryMessageTable_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "QueryMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMessageTable" ADD CONSTRAINT "QueryMessageTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SchemaTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuerySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
