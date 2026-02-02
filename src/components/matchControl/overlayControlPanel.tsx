import { Card, CardContent } from '@/components/ui/card';

export default function OverlayControlPanel() {
    return (
        <Card>
            <CardContent className="min-h-[200px] py-6">
                <p className="text-muted-foreground">Overlay panel</p>
            </CardContent>
        </Card>
    );
}
