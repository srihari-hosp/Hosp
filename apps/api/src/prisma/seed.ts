import { PrismaClient, UserRole, Gender, PatientType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import "dotenv/config";
import { hashSensitiveValue } from "../utils/hash.js";

const prisma = new PrismaClient();
const seedPrisma = prisma as unknown as {
  labTest?: {
    upsert: (args: unknown) => Promise<unknown>;
  };
};

async function main() {
  console.log("Starting seed...");
  const licenseNo = hashSensitiveValue("LIC-APOLLO-HYD-001");
  const gstin = hashSensitiveValue("36AABCU9603R1ZM");

  // Create demo hospital
  const hospital = await prisma.hospital.upsert({
    where: { licenseNo },
    update: {},
    create: {
      name: "Apollo Clinic Hyderabad",
      address: "Banjara Hills, Hyderabad, Telangana 500034",
      licenseNo,
      gstin,
      phone: "+91-40-12345678",
      email: "admin@apollohyd.com",
    },
  });
  console.log("Created hospital:", hospital.name);

  // Create admin user
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@hospital.com" },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      hospitalId: hospital.id,
    },
    create: {
      email: "admin@hospital.com",
      passwordHash,
      role: UserRole.ADMIN,
      hospitalId: hospital.id,
    },
  });
  console.log("Created admin user:", admin.email);

  // Create sample patients (idempotent)
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { hospitalId_mrn: { hospitalId: hospital.id, mrn: "MRN-001" } },
      update: {},
      create: {
        mrn: "MRN-001",
        name: "Rajesh Kumar",
        age: 45,
        gender: Gender.MALE,
        phone: "+91-9876543210",
        email: "rajesh.kumar@example.com",
        address: "Jubilee Hills, Hyderabad",
        patientType: PatientType.OPD,
        hospitalId: hospital.id,
      },
    }),
    prisma.patient.upsert({
      where: { hospitalId_mrn: { hospitalId: hospital.id, mrn: "MRN-002" } },
      update: {},
      create: {
        mrn: "MRN-002",
        name: "Priya Sharma",
        age: 32,
        gender: Gender.FEMALE,
        phone: "+91-9876543211",
        email: "priya.sharma@example.com",
        address: "Gachibowli, Hyderabad",
        patientType: PatientType.OPD,
        hospitalId: hospital.id,
      },
    }),
    prisma.patient.upsert({
      where: { hospitalId_mrn: { hospitalId: hospital.id, mrn: "MRN-003" } },
      update: {},
      create: {
        mrn: "MRN-003",
        name: "Mohammed Ali",
        age: 28,
        gender: Gender.MALE,
        phone: "+91-9876543212",
        address: "Kukatpally, Hyderabad",
        patientType: PatientType.IPD,
        hospitalId: hospital.id,
      },
    }),
  ]);
  console.log(`Created ${patients.length} sample patients`);

  const demoDoctorId = "44444444-4444-4444-8444-444444444444";
  const doctor = await prisma.doctor.upsert({
    where: { id: demoDoctorId },
    update: {},
    create: {
      id: demoDoctorId,
      name: "Dr. Ananya Rao",
      specialization: "General Medicine",
      hospitalId: hospital.id,
      isActive: true,
    },
  });
  console.log("Created demo doctor:", doctor.name);

  if (!seedPrisma.labTest) {
    console.warn(
      "Skipping LabTest seed because Prisma client is missing lab delegates. Run prisma generate after applying lab migration."
    );
  } else {
    const labTests = [
      {
        code: "CBC",
        name: "Complete Blood Count",
        category: "Hematology",
        sampleType: "Blood",
        defaultUnit: null,
        referenceRange: "See differential ranges",
        instructions: "No fasting required",
      },
      {
        code: "GLU-F",
        name: "Fasting Blood Glucose",
        category: "Biochemistry",
        sampleType: "Blood",
        defaultUnit: "mg/dL",
        referenceRange: "70-110",
        instructions: "8-10 hours fasting",
      },
      {
        code: "HBA1C",
        name: "HbA1c",
        category: "Biochemistry",
        sampleType: "Blood",
        defaultUnit: "%",
        referenceRange: "4.0-5.6",
        instructions: "No fasting required",
      },
      {
        code: "TSH",
        name: "Thyroid Stimulating Hormone",
        category: "Endocrinology",
        sampleType: "Blood",
        defaultUnit: "uIU/mL",
        referenceRange: "0.4-4.0",
        instructions: "Morning sample preferred",
      },
    ];

    await Promise.all(
      labTests.map((test) =>
        seedPrisma.labTest!.upsert({
          where: {
            hospitalId_code: {
              hospitalId: hospital.id,
              code: test.code,
            },
          },
          update: {
            name: test.name,
            category: test.category,
            sampleType: test.sampleType,
            defaultUnit: test.defaultUnit,
            referenceRange: test.referenceRange,
            instructions: test.instructions,
            isActive: true,
          },
          create: {
            hospitalId: hospital.id,
            code: test.code,
            name: test.name,
            category: test.category,
            sampleType: test.sampleType,
            defaultUnit: test.defaultUnit,
            referenceRange: test.referenceRange,
            instructions: test.instructions,
            isActive: true,
          },
        })
      )
    );
    console.log(`Created/updated ${labTests.length} lab tests`);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
