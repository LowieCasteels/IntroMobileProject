import 'dart:io';
import 'dart:convert'; // Import voor base64Encode/Decode
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

// Firebase Storage is niet langer nodig voor het uploaden van afbeeldingen
class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();

  String? _base64Image; // Om de base64 string van de afbeelding op te slaan
  String? _selectedCategory;
  // Index 0: Te leen, Index 1: Te huur
  List<bool> _transactionType = [true, false];
  bool _isVisible = true;
  bool _isLoading = false;

  final List<String> _categories = [
    'Beeld & Geluid',
    'Gaming & Speelgoed',
    'Dieren & Toebehoren',
    'Verzorging, Welzijn & Baby',
    'Kleding & Kostuums',
    'Klussen & Gereedschap',
    'Koken & Tafelen',
    'Huishouden & Schoonmaak',
    'Vakantie, Sport & Vrije tijd',
    'Vervoer & Transport',
    'Computers, Telefoons & Toebehoren',
    'Overige spullen',
    'Party, Event & Tuinfeest',
  ];
  final Color purpleColor = const Color(0xFF5E25D9);
  final Color greenColor = const Color(0xFF00C374);

  @override
  void initState() {
    super.initState();
    _titleController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() {
          _base64Image = base64Encode(bytes);
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Afbeelding selectie geannuleerd.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Fout bij het kiezen van afbeelding: ${e.toString()}',
            ),
          ),
        );
      }
      print('Error picking image: $e');
    }
  }

  void _clearForm() {
    _titleController.clear();
    _descriptionController.clear();
    _priceController.clear();
    setState(() {
      _base64Image = null;
      _selectedCategory = null;
      _transactionType = [true, false];
      _isVisible = true;
    });
  }

  Future<void> _saveProduct() async {
    if (!(_formKey.currentState?.validate() ?? false) || _base64Image == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vul alle velden in en voeg een foto toe.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception("Gebruiker niet ingelogd.");

      // Haal gebruikersgegevens op om de stad te krijgen
      final userDoc = await FirebaseFirestore.instance
          .collection('flutterUsers')
          .doc(user.uid)
          .get();
      final city = userDoc.data()?['city'] ?? 'Onbekend';

      final isForRent = _transactionType[1];

      await FirebaseFirestore.instance.collection('appliances').add({
        'ownerId': user.uid,
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'category': _selectedCategory,
        'price': isForRent
            ? (double.tryParse(_priceController.text.trim()) ?? 0.0)
            : 0.0,
        'transactionType': isForRent ? 'huur' : 'leen',
        'base64Image': _base64Image,
        'isVisible': _isVisible,
        'createdAt': FieldValue.serverTimestamp(),
        'city': city, // Voeg de stad van de gebruiker toe
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product succesvol toegevoegd!')),
        );
        _clearForm();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij opslaan: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 24.0, bottom: 8.0),
      child: Text(
        text,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Toestel aanbieden'),
        backgroundColor: Color(Colors.white.value),
        actions: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => context.pop(),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      height: 150,
                      width: 150,
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: _base64Image != null
                          ? ClipRRect(
                              // Gebruik _base64Image voor weergave
                              borderRadius: BorderRadius.circular(12),
                              child: Image.memory(
                                base64Decode(
                                  _base64Image!,
                                ), // Decodeer de Base64 string naar bytes
                                fit: BoxFit.cover,
                              ),
                            )
                          : const Icon(
                              Icons.image,
                              size: 50,
                              color: Colors.grey,
                            ),
                    ),
                    FloatingActionButton(
                      onPressed: _pickImage,
                      mini: true,
                      backgroundColor: purpleColor,
                      child: const Icon(Icons.camera_alt, color: Colors.white),
                    ),
                  ],
                ),
              ),
              _buildLabel("Producttitel"),
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  hintText: "Wat wil je aanbieden?",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  suffixIcon: _titleController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () => _titleController.clear(),
                        )
                      : null,
                ),
                validator: (value) =>
                    (value?.isEmpty ?? true) ? 'Titel is verplicht' : null,
              ),
              _buildLabel("Beschrijving"),
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: "Beschrijf je product voor alle duidelijkheid.",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) => (value?.isEmpty ?? true)
                    ? 'Beschrijving is verplicht'
                    : null,
              ),
              _buildLabel("Type Transactie"),
              ToggleButtons(
                isSelected: _transactionType,
                onPressed: (index) {
                  setState(() {
                    _transactionType = [false, false];
                    _transactionType[index] = true;
                  });
                },
                borderRadius: BorderRadius.circular(8),
                selectedColor: Colors.white,
                fillColor: greenColor,
                constraints: BoxConstraints.expand(
                  width: (MediaQuery.of(context).size.width - 43) / 2,
                  height: 40,
                ),
                children: const [
                  Center(child: Text('Te leen')),
                  Center(child: Text('Te huur')),
                ],
              ),
              if (_transactionType[1]) // If 'Te huur' is selected
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel("Prijs per dag (€)"),
                    TextFormField(
                      controller: _priceController,
                      decoration: InputDecoration(
                        hintText: "0.00",
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (value) {
                        if (_transactionType[1] && (value?.isEmpty ?? true)) {
                          return 'Prijs is verplicht voor verhuur';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              _buildLabel("Categorie"),
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                hint: const Text('Kies een categorie'),
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                items: _categories.map((String category) {
                  return DropdownMenuItem<String>(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (newValue) =>
                    setState(() => _selectedCategory = newValue),
                validator: (value) =>
                    value == null ? 'Categorie is verplicht' : null,
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text("Zichtbaar voor anderen"),
                value: _isVisible,
                onChanged: (bool value) => setState(() => _isVisible = value),
                activeThumbColor: greenColor,
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _saveProduct,
                style: ElevatedButton.styleFrom(
                  backgroundColor: purpleColor,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        "Opslaan",
                        style: TextStyle(color: Colors.white, fontSize: 18),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
