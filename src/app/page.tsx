import { redirect } from 'next/navigation';

export default function Home() {
    // This performs a server-side redirect
    redirect('/dashboard/population');
}