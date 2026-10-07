import { NextRequest } from 'next/server';
import { runAlerts } from '@/lib/notifications/jobs';
export async function GET(request: NextRequest) { return runAlerts(request, 'digest'); }
