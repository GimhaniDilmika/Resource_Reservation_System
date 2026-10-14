import { PrismaClient, Role, ReservationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.resourceCategory.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Sachintha Nimesh (Admin)",
      email: "admin@primewave.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      name: "Alex Perera",
      email: "user@primewave.com",
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "sarah@primewave.com",
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  console.log("Created demo users: admin@primewave.com, user@primewave.com");

  // Create Categories
  const catRoom = await prisma.resourceCategory.create({
    data: { name: "Conference Rooms" },
  });
  const catEquipment = await prisma.resourceCategory.create({
    data: { name: "Media & Audio Equipment" },
  });
  const catHardware = await prisma.resourceCategory.create({
    data: { name: "Computing & Lab Workstations" },
  });
  const catVehicle = await prisma.resourceCategory.create({
    data: { name: "Company Vehicles" },
  });

  // Create Resources
  const roomA = await prisma.resource.create({
    data: {
      name: "Innovation Hub (Room A)",
      categoryId: catRoom.id,
      location: "Building 1, 3rd Floor",
      capacity: 14,
      description: "Equipped with 75-inch 4K smart display, Zoom Room conferencing system, and magnetic whiteboards.",
      isActive: true,
    },
  });

  const roomB = await prisma.resource.create({
    data: {
      name: "Executive Boardroom",
      categoryId: catRoom.id,
      location: "Building 1, 4th Floor - Penthouse",
      capacity: 22,
      description: "Formal executive boardroom with acoustic paneling, dedicated teleconference mic array, and refreshment station.",
      isActive: true,
    },
  });

  const devLab = await prisma.resource.create({
    data: {
      name: "AI & Deep Learning Station",
      categoryId: catHardware.id,
      location: "R&D Wing, Station 12",
      capacity: 2,
      description: "Dual NVIDIA RTX 4090 GPUs, 128GB RAM, PyTorch & TensorFlow preloaded for intensive model training.",
      isActive: true,
    },
  });

  const mediaKit = await prisma.resource.create({
    data: {
      name: "4K Cinema Camera & Lighting Kit",
      categoryId: catEquipment.id,
      location: "Studio Locker #04",
      capacity: 1,
      description: "Sony FX3 cinema package, wireless lavalier microphones, and Aputure bi-color LED softbox kit.",
      isActive: true,
    },
  });

  const electricVan = await prisma.resource.create({
    data: {
      name: "PrimeWave Electric Transport Van",
      categoryId: catVehicle.id,
      location: "Underground Parking, Slot EV-02",
      capacity: 8,
      description: "Zero-emission electric passenger and cargo van for client visits and site transport.",
      isActive: true,
    },
  });

  console.log("Created 5 initial resources across 4 categories.");

  // Generate reference dates for today
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  // Create sample reservations for today and tomorrow
  const slot1Start = new Date(Date.UTC(year, month, day, 9, 0, 0));
  const slot1End = new Date(Date.UTC(year, month, day, 10, 30, 0));

  await prisma.reservation.create({
    data: {
      resourceId: roomA.id,
      userId: admin.id,
      title: "Sprint Planning Q4 & Architecture Alignment",
      notes: "Please bring laptops and updated JIRA sprint backlog items.",
      startTime: slot1Start,
      endTime: slot1End,
      status: ReservationStatus.CONFIRMED,
    },
  });

  const slot2Start = new Date(Date.UTC(year, month, day, 14, 0, 0));
  const slot2End = new Date(Date.UTC(year, month, day, 16, 0, 0));

  await prisma.reservation.create({
    data: {
      resourceId: roomA.id,
      userId: member1.id,
      title: "Client Demonstration - PrimeWave Enterprise Suite",
      notes: "Remote client joining via Zoom. Need screen sharing setup.",
      startTime: slot2Start,
      endTime: slot2End,
      status: ReservationStatus.CONFIRMED,
    },
  });

  const slot3Start = new Date(Date.UTC(year, month, day, 10, 0, 0));
  const slot3End = new Date(Date.UTC(year, month, day, 12, 0, 0));

  await prisma.reservation.create({
    data: {
      resourceId: devLab.id,
      userId: member2.id,
      title: "Fine-Tuning Vision Model Checkpoints",
      notes: "Training epoch runs scheduled with live metrics export.",
      startTime: slot3Start,
      endTime: slot3End,
      status: ReservationStatus.CONFIRMED,
    },
  });

  console.log("Database seeded successfully with users, resources, and confirmed reservations!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
