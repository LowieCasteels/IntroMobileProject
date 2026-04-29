import 'package:flutter/material.dart';
import 'home_screen.dart';
// import 'search_screen.dart';
// import 'add_product_screen.dart';
// import 'products_screen.dart';
import 'profile_screen.dart';
// import 'package:flutter_project/screens/home_screen.dart';
import 'package:flutter_project/screens/map_screen.dart';
// import 'package:flutter_project/screens/profile_screen.dart';
import 'package:go_router/go_router.dart';

class navbar extends StatefulWidget {
  const navbar({super.key});

  @override
  State<navbar> createState() => _navbarState();
}

class _navbarState extends State<navbar> {
  int _selectedIndex = 0;

  static const List<Widget> _pages = <Widget>[
    HomeScreen(),
    MapScreen(),
    Center(child: Text('Berichten (nog niet geïmplementeerd)')), // Placeholder
    ProfileScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final Color activeColor = const Color(0xFF2DBA8D);
    final Color inactiveColor = Colors.grey;

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: _pages),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-appliance'),
        backgroundColor: activeColor,
        child: const Icon(Icons.add, color: Colors.white),
        shape: const CircleBorder(),
        elevation: 2.0,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: <Widget>[
            IconButton(
              tooltip: 'Home',
              icon: Icon(
                Icons.home,
                color: _selectedIndex == 0 ? activeColor : inactiveColor,
              ),
              onPressed: () => _onItemTapped(0),
            ),
            IconButton(
              tooltip: 'Kaart',
              icon: Icon(
                Icons.map,
                color: _selectedIndex == 1 ? activeColor : inactiveColor,
              ),
              onPressed: () => _onItemTapped(1),
            ),
            const SizedBox(width: 40), // The space for the FAB
            IconButton(
              tooltip: 'Berichten',
              icon: Icon(
                Icons.message,
                color: _selectedIndex == 2 ? activeColor : inactiveColor,
              ),
              onPressed: () => _onItemTapped(2),
            ),
            IconButton(
              tooltip: 'Profiel',
              icon: Icon(
                Icons.person,
                color: _selectedIndex == 3 ? activeColor : inactiveColor,
              ),
              onPressed: () => _onItemTapped(3),
            ),
          ],
        ),
      ),
    );
  }
}
