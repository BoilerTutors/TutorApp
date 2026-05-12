import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../api/client";

type PaymentStatus = {
  stripe_account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  ready_for_payments: boolean;
  ready_for_payouts: boolean;
};

type OnboardingResponse = {
  onboarding_url: string;
};

export default function PaymentSettingsTab({
  showAlert,
}: {
  showAlert: (title: string, message: string) => void;
}) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingOnboarding, setOpeningOnboarding] = useState(false);

  const loadStatus = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const paymentStatus = await api.get<PaymentStatus>("/payment/connect/status");
        setStatus(paymentStatus);
      } catch (e) {
        showAlert("Error", e instanceof Error ? e.message : "Failed to load payment settings");
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [showAlert]
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onOpenOnboarding = async () => {
    try {
      setOpeningOnboarding(true);
      const response = await api.get<OnboardingResponse>("/payment/connect/onboarding");
      if (!response.onboarding_url) {
        showAlert("Error", "Onboarding link is unavailable right now.");
        return;
      }
      await Linking.openURL(response.onboarding_url);
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to open Stripe onboarding");
    } finally {
      setOpeningOnboarding(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Payment Settings</Text>
        <Text style={styles.subtitle}>
          Connect your Stripe account to receive payouts and process tutoring payments.
        </Text>

        {loading ? (
          <Text style={styles.helper}>Loading payment status...</Text>
        ) : status ? (
          <>
            <StatusRow
              label="Account details submitted"
              helper="Complete your Stripe profile and identity checks."
              enabled={status.details_submitted}
            />
            <StatusRow
              label="Payments enabled"
              helper="Allows students to pay for tutoring sessions."
              enabled={status.ready_for_payments}
            />
            <StatusRow
              label="Payouts enabled"
              helper="Allows your earnings to be transferred to your bank."
              enabled={status.ready_for_payouts}
            />
            <Text style={styles.accountHint}>Stripe account: {status.stripe_account_id}</Text>
          </>
        ) : (
          <Text style={styles.helper}>Payment status is currently unavailable.</Text>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.secondaryBtn, refreshing && styles.disabledBtn]}
            onPress={() => void loadStatus(true)}
            disabled={refreshing || loading || openingOnboarding}
          >
            <Text style={styles.secondaryBtnText}>
              {refreshing ? "Refreshing..." : "Refresh status"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, openingOnboarding && styles.disabledBtn]}
            onPress={() => void onOpenOnboarding()}
            disabled={openingOnboarding || loading || refreshing}
          >
            <Text style={styles.saveBtnText}>
              {openingOnboarding ? "Opening..." : "Open Stripe onboarding"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatusRow({
  label,
  helper,
  enabled,
}: {
  label: string;
  helper: string;
  enabled: boolean;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceHelper}>{helper}</Text>
      </View>
      <View style={[styles.badge, enabled ? styles.badgeOn : styles.badgeOff]}>
        <Text style={[styles.badgeText, enabled ? styles.badgeTextOn : styles.badgeTextOff]}>
          {enabled ? "Enabled" : "Pending"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E5EE",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F3850",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5D667C",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
  },
  helper: {
    fontSize: 14,
    color: "#5D667C",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E1E5EE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2F3850",
  },
  preferenceHelper: {
    marginTop: 4,
    fontSize: 13,
    color: "#5D667C",
    lineHeight: 18,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeOn: {
    backgroundColor: "#EDFDF3",
    borderColor: "#86EFAC",
  },
  badgeOff: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextOn: {
    color: "#166534",
  },
  badgeTextOff: {
    color: "#475569",
  },
  accountHint: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 12,
    color: "#64748B",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  saveBtn: {
    backgroundColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: "auto",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2E57A2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#2E57A2",
    fontWeight: "600",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
