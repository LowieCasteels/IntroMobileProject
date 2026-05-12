import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/request.dart';
import 'package:flutter_project/screens/request_helpers.dart';

class LoanListItem extends StatelessWidget {
  final Request loanRequest;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  const LoanListItem({
    super.key,
    required this.loanRequest,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;
    final bool isOwner = currentUserId == loanRequest.ownerId;
    final bool canMarkAsReturned = isOwner && loanRequest.status == 'accepted';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle!),
              ],
              const SizedBox(height: 4),
              Text('Status: ${loanRequest.status}'),
              if (canMarkAsReturned) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () =>
                        showReturnConfirmationDialog(context, loanRequest.id),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2DBA8D), // Primary Green
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Markeer als geretourneerd'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
