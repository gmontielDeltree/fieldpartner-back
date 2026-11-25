-- KAN-57: per-user menu permissions (CouchDB modules-users). No data import: PostgreSQL
-- starts empty and the permissions are assigned from the back.

-- CreateTable
CREATE TABLE "user_menu_permissions" (
    "userId" TEXT NOT NULL,
    "menuModuleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_menu_permissions_pkey" PRIMARY KEY ("userId","menuModuleId")
);

-- CreateIndex
CREATE INDEX "user_menu_permissions_menuModuleId_idx" ON "user_menu_permissions"("menuModuleId");

-- AddForeignKey
ALTER TABLE "user_menu_permissions" ADD CONSTRAINT "user_menu_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_permissions" ADD CONSTRAINT "user_menu_permissions_menuModuleId_fkey" FOREIGN KEY ("menuModuleId") REFERENCES "menu_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
