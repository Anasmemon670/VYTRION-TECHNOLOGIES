import { OrderDetailPage } from "@/pages/OrderDetailPage";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  return <OrderDetailPage params={params} />;
}
