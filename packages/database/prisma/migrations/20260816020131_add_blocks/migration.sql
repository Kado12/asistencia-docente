-- AlterTable
ALTER TABLE `teacher_classes` ADD COLUMN `blockId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `blocks` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startWeek` INTEGER NOT NULL,
    `endWeek` INTEGER NOT NULL,

    UNIQUE INDEX `blocks_periodId_name_key`(`periodId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `teacher_classes` ADD CONSTRAINT `teacher_classes_blockId_fkey` FOREIGN KEY (`blockId`) REFERENCES `blocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
