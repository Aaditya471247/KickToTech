import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { HttpError } from '../../lib/http';
import { signToken } from '../../middleware/auth';
import { createFarm } from '../farms/farm.service';

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  region?: string;
}

const publicUser = (u: { id: string; name: string; phone: string; region: string; role: string }) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  region: u.region,
  role: u.role,
});

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (exists) throw new HttpError(409, 'This phone number is already registered');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, phone: input.phone, passwordHash, region: input.region ?? 'Maharashtra' },
  });
  // Give every new farmer a first farm with its three sensor nodes, so the dashboard works immediately.
  await createFarm(user.id, { name: `${user.name.split(' ')[0]}'s farm`, totalArea: 1, soilType: 'Black cotton soil' });
  return { token: signToken(user), user: publicUser(user) };
}

export async function login(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  // Same message for "no such user" and "wrong password" so accounts cannot be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Phone number or password is incorrect');
  return { token: signToken(user), user: publicUser(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}
