import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

import { copyDefaultConfigToFournisseur } from "@/lib/copyDefaultConfig";

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string; email?: string } | undefined;
  if (admin?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (userToDelete.role === "SUPER_ADMIN" || userToDelete.email === admin.email) {
      return NextResponse.json(
        { error: "Impossible de supprimer ce compte" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string } | undefined;
  if (admin?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const name = body.name as string | undefined;
  const email = (body.email as string | undefined)?.toLowerCase();
  const password = body.password as string | undefined;
  const role = body.role as string | undefined;

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Nom, email et mot de passe (6 caractères min.) requis" },
      { status: 400 }
    );
  }
  if (role !== "FOURNISSEUR" && role !== "ACHETEUR") {
    return NextResponse.json(
      { error: "Rôle doit être FOURNISSEUR ou ACHETEUR" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: email!.trim() } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte avec cet e-mail existe déjà" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.user.create({
    data: {
      name: name!.trim(),
      email: email!.trim(),
      passwordHash,
      role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (role === "FOURNISSEUR") {
    // Run asynchronously without blocking the response, or await it
    // Best to await it so the admin can see it instantly
    await copyDefaultConfigToFournisseur(created.id);
  }

  return NextResponse.json(created, { status: 201 });
}
