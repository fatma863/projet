import { Component } from 'react';
import { Card, CardContent } from './Card';

/**
 * Catches erreurs de rendu des enfants (lifecycle / render).
 * Les erreurs dans les handlers async ne sont pas capturées.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm">
            <p className="font-medium text-destructive">Le diagramme n&apos;a pas pu s&apos;afficher</p>
            <p className="mt-2 text-muted-foreground">
              {this.state.error?.message || 'Erreur inattendue.'}
            </p>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
