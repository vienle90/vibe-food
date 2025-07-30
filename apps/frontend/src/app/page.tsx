import { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Vibe Food Ordering
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover amazing restaurants, browse delicious menus, and get your favorite food delivered right to your door.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-card-foreground mb-3">
              🍕 Discover Restaurants
            </h2>
            <p className="text-muted-foreground">
              Browse through hundreds of local restaurants and cuisines in your area.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-card-foreground mb-3">
              📱 Easy Ordering
            </h2>
            <p className="text-muted-foreground">
              Simple and intuitive ordering process with real-time updates.
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-card-foreground mb-3">
              🚚 Fast Delivery
            </h2>
            <p className="text-muted-foreground">
              Track your order in real-time and get fresh food delivered quickly.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">
            🚀 Coming Soon - Full App Launch
          </div>
        </div>
      </div>
    </main>
  );
}