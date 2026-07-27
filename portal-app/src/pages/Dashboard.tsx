
import { CustomerList } from '../components/CustomerList';
import { FollowUpList } from '../components/FollowUpList';

export function Dashboard() {
    return (
        <div className="app-container">
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--primary-color)' }}>Sales Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                    <FollowUpList />
                </div>
                <div>
                    <CustomerList />
                </div>
            </div>
        </div>
    );
}
